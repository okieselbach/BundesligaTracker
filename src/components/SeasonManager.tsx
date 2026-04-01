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
import type { FullRelegationChanges } from "@/lib/seed";
import { computeStandings } from "@/lib/standings";
import { computeRelegationProposal, type RelegationProposal } from "@/lib/relegation";
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

        // Load standings for all 3 leagues
        const leagueSlugs = ["1-bundesliga", "2-bundesliga", "3-liga"] as const;
        const standingsMap: Record<string, import("@/lib/standings").StandingRow[]> = {};

        for (const slug of leagueSlugs) {
          const comp = COMPETITIONS.find((c) => c.slug === slug);
          if (!comp) continue;
          const sc = scs.find((s) => s.competitionId === comp.id);
          if (!sc) continue;

          const matches = await db.matches
            .where("seasonCompetitionId")
            .equals(sc.id)
            .toArray();
          const playedMatches = matches.filter((m) => typeof m.homeGoals === "number");

          if (playedMatches.length > 0) {
            standingsMap[slug] = computeStandings(sc, playedMatches);
          } else {
            standingsMap[slug] = [];
          }
        }

        // Compute full relegation proposal
        const prop = computeRelegationProposal({
          standings1BL: standingsMap["1-bundesliga"] || [],
          standings2BL: standingsMap["2-bundesliga"] || [],
          standings3BL: standingsMap["3-liga"] || [],
        });
        setProposal(prop);
        setPlayoffWinners(new Map());

        // Set 3. Liga Absteiger from proposal
        if (prop.markedAbstieg3Liga.length > 0) {
          setAbsteigerClubs(
            prop.markedAbstieg3Liga.map((id) => cMap.get(id)).filter(Boolean) as Club[]
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
        const has3LChanges = absteigerClubs.length > 0 && selectedAufsteiger.size === ABSTIEG_COUNT;

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

  // Valid state: either no Absteiger (no changes), or exactly ABSTIEG_COUNT Aufsteiger selected
  const aufsteigValid =
    absteigerClubs.length === 0 ||
    selectedAufsteiger.size === 0 ||
    selectedAufsteiger.size === ABSTIEG_COUNT;

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

                  {/* 1. BL / 2. BL direct moves */}
                  {(proposal.directRelegations.some((r) => r.from === "1-bundesliga") ||
                    proposal.directPromotions.some((p) => p.to === "1-bundesliga")) && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-semibold">1. BL / 2. BL</p>
                      <div className="space-y-1">
                        {proposal.directRelegations
                          .filter((r) => r.from === "1-bundesliga")
                          .map((r) => {
                            const club = clubMap.get(r.clubId);
                            if (!club) return null;
                            return (
                              <div key={r.clubId} className="flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1.5">
                                <span className="text-xs">↓</span>
                                <ClubLogo logoUrl={club.logoUrl} name={club.name} shortName={club.shortName} primaryColor={club.primaryColor} size="sm" />
                                <span className="text-xs font-medium">{club.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">→ 2. BL</span>
                              </div>
                            );
                          })}
                        {proposal.directPromotions
                          .filter((p) => p.to === "1-bundesliga")
                          .map((p) => {
                            const club = clubMap.get(p.clubId);
                            if (!club) return null;
                            return (
                              <div key={p.clubId} className="flex items-center gap-2 rounded border border-green-500/30 bg-green-500/10 px-2.5 py-1.5">
                                <span className="text-xs">↑</span>
                                <ClubLogo logoUrl={club.logoUrl} name={club.name} shortName={club.shortName} primaryColor={club.primaryColor} size="sm" />
                                <span className="text-xs font-medium">{club.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">→ 1. BL</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Relegation 1. BL / 2. BL playoff */}
                  {proposal.relegationMatches.length > 0 && proposal.relegationMatches[0] && proposal.relegationMatches[0].higher.league === "1-bundesliga" && (() => {
                    const match = proposal.relegationMatches[0];
                    const higherClub = clubMap.get(match.higher.clubId);
                    const lowerClub = clubMap.get(match.lower.clubId);
                    if (!higherClub || !lowerClub) return null;
                    const selected = playoffWinners.get(0);
                    return (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-semibold">Relegation 1. BL / 2. BL</p>
                        <p className="text-xs text-muted-foreground">
                          Platz {match.higher.position} (1. BL) vs Platz {match.lower.position} (2. BL) — Wer spielt nächste Saison 1. BL?
                        </p>
                        <div className="space-y-1">
                          <button
                            onClick={() => setPlayoffWinners((prev) => new Map(prev).set(0, "higher"))}
                            className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left transition-colors ${
                              selected === "higher" ? "border border-blue-500/30 bg-blue-500/10" : "hover:bg-secondary/50"
                            }`}
                          >
                            <div className={`h-4 w-4 shrink-0 rounded-full border ${selected === "higher" ? "border-blue-500 bg-blue-500" : "border-border"} flex items-center justify-center`}>
                              {selected === "higher" && <span className="text-[8px] text-white font-bold">●</span>}
                            </div>
                            <ClubLogo logoUrl={higherClub.logoUrl} name={higherClub.name} shortName={higherClub.shortName} primaryColor={higherClub.primaryColor} size="sm" />
                            <span className="text-xs font-medium">{higherClub.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">bleibt 1. BL</span>
                          </button>
                          <button
                            onClick={() => setPlayoffWinners((prev) => new Map(prev).set(0, "lower"))}
                            className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left transition-colors ${
                              selected === "lower" ? "border border-blue-500/30 bg-blue-500/10" : "hover:bg-secondary/50"
                            }`}
                          >
                            <div className={`h-4 w-4 shrink-0 rounded-full border ${selected === "lower" ? "border-blue-500 bg-blue-500" : "border-border"} flex items-center justify-center`}>
                              {selected === "lower" && <span className="text-[8px] text-white font-bold">●</span>}
                            </div>
                            <ClubLogo logoUrl={lowerClub.logoUrl} name={lowerClub.name} shortName={lowerClub.shortName} primaryColor={lowerClub.primaryColor} size="sm" />
                            <span className="text-xs font-medium">{lowerClub.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">steigt auf in 1. BL</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. BL / 3. Liga direct moves */}
                  {(proposal.directRelegations.some((r) => r.from === "2-bundesliga") ||
                    proposal.directPromotions.some((p) => p.to === "2-bundesliga")) && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-semibold">2. BL / 3. Liga</p>
                      <div className="space-y-1">
                        {proposal.directRelegations
                          .filter((r) => r.from === "2-bundesliga")
                          .map((r) => {
                            const club = clubMap.get(r.clubId);
                            if (!club) return null;
                            return (
                              <div key={r.clubId} className="flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1.5">
                                <span className="text-xs">↓</span>
                                <ClubLogo logoUrl={club.logoUrl} name={club.name} shortName={club.shortName} primaryColor={club.primaryColor} size="sm" />
                                <span className="text-xs font-medium">{club.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">→ 3. Liga</span>
                              </div>
                            );
                          })}
                        {proposal.directPromotions
                          .filter((p) => p.to === "2-bundesliga")
                          .map((p) => {
                            const club = clubMap.get(p.clubId);
                            if (!club) return null;
                            return (
                              <div key={p.clubId} className="flex items-center gap-2 rounded border border-green-500/30 bg-green-500/10 px-2.5 py-1.5">
                                <span className="text-xs">↑</span>
                                <ClubLogo logoUrl={club.logoUrl} name={club.name} shortName={club.shortName} primaryColor={club.primaryColor} size="sm" />
                                <span className="text-xs font-medium">{club.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">→ 2. BL</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Relegation 2. BL / 3. Liga playoff */}
                  {proposal.relegationMatches.length > 1 && proposal.relegationMatches[1] && proposal.relegationMatches[1].higher.league === "2-bundesliga" && (() => {
                    const match = proposal.relegationMatches[1];
                    const higherClub = clubMap.get(match.higher.clubId);
                    const lowerClub = clubMap.get(match.lower.clubId);
                    if (!higherClub || !lowerClub) return null;
                    const selected = playoffWinners.get(1);
                    return (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-semibold">Relegation 2. BL / 3. Liga</p>
                        <p className="text-xs text-muted-foreground">
                          Platz {match.higher.position} (2. BL) vs Platz {match.lower.position} (3. Liga) — Wer spielt nächste Saison 2. BL?
                        </p>
                        <div className="space-y-1">
                          <button
                            onClick={() => setPlayoffWinners((prev) => new Map(prev).set(1, "higher"))}
                            className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left transition-colors ${
                              selected === "higher" ? "border border-blue-500/30 bg-blue-500/10" : "hover:bg-secondary/50"
                            }`}
                          >
                            <div className={`h-4 w-4 shrink-0 rounded-full border ${selected === "higher" ? "border-blue-500 bg-blue-500" : "border-border"} flex items-center justify-center`}>
                              {selected === "higher" && <span className="text-[8px] text-white font-bold">●</span>}
                            </div>
                            <ClubLogo logoUrl={higherClub.logoUrl} name={higherClub.name} shortName={higherClub.shortName} primaryColor={higherClub.primaryColor} size="sm" />
                            <span className="text-xs font-medium">{higherClub.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">bleibt 2. BL</span>
                          </button>
                          <button
                            onClick={() => setPlayoffWinners((prev) => new Map(prev).set(1, "lower"))}
                            className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left transition-colors ${
                              selected === "lower" ? "border border-blue-500/30 bg-blue-500/10" : "hover:bg-secondary/50"
                            }`}
                          >
                            <div className={`h-4 w-4 shrink-0 rounded-full border ${selected === "lower" ? "border-blue-500 bg-blue-500" : "border-border"} flex items-center justify-center`}>
                              {selected === "lower" && <span className="text-[8px] text-white font-bold">●</span>}
                            </div>
                            <ClubLogo logoUrl={lowerClub.logoUrl} name={lowerClub.name} shortName={lowerClub.shortName} primaryColor={lowerClub.primaryColor} size="sm" />
                            <span className="text-xs font-medium">{lowerClub.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">steigt auf in 2. BL</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. Liga / Regionalliga Auf-/Abstieg */}
                  {absteigerClubs.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-semibold">3. Liga / Regionalliga</p>

                      {/* Absteiger */}
                      <p className="text-xs text-muted-foreground">Absteiger (Platz {21 - ABSTIEG_COUNT}-20):</p>
                      <div className="space-y-1">
                        {absteigerClubs.map((club) => (
                          <div key={club.id} className="flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1.5">
                            <span className="text-xs">↓</span>
                            <ClubLogo logoUrl={club.logoUrl} name={club.name} shortName={club.shortName} primaryColor={club.primaryColor} size="sm" />
                            <span className="text-xs font-medium">{club.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">→ Regionalliga</span>
                          </div>
                        ))}
                      </div>

                      {/* Aufsteiger Auswahl */}
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
                                <ClubLogo logoUrl={club.logoUrl} name={club.name} shortName={club.shortName} primaryColor={club.primaryColor} size="sm" />
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
                Die neue Saison wird als aktuelle Saison gesetzt. {scheduleMode === "manual" ? "Leere Spieltage werden erstellt - Begegnungen müssen manuell eingetragen werden." : "Spielpläne werden automatisch generiert."} DFB-Pokal muss separat ausgelost werden.
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
