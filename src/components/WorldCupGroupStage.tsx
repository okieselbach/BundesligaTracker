"use client";

import { useMemo, useState } from "react";
import type { Club, Id, Match, Matchday, SeasonCompetition } from "@/lib/db";
import { db, newId } from "@/lib/db";
import { WC_COUNTRIES } from "@/data/wc/countries";
import {
  buildGroupStageSchedule,
  computeGroupStandings,
  computeQualification,
  groupLetter,
  WC_GROUP_COUNT,
  WC_TEAMS_PER_GROUP,
} from "@/lib/worldcup";
import { ClubLogo } from "./ClubLogo";
import { MatchCard } from "./MatchCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Shuffle, Trash2, X, Search, Trophy, Users, ListChecks } from "lucide-react";

interface WorldCupGroupStageProps {
  seasonCompetition: SeasonCompetition | null;
  matches: Match[];
  matchdays: Matchday[];
  /** All clubs in the DB (includes the countries the user has already added). */
  allClubs: Club[];
  onRefresh: () => void;
}

const TOTAL_TEAMS = WC_GROUP_COUNT * WC_TEAMS_PER_GROUP; // 48

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function WorldCupGroupStage({
  seasonCompetition,
  matches,
  matchdays,
  allClubs,
  onRefresh,
}: WorldCupGroupStageProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPoolClub, setSelectedPoolClub] = useState<Id | null>(null);
  const [playTab, setPlayTab] = useState<"tabellen" | "spiele">("tabellen");
  const [activeMatchday, setActiveMatchday] = useState(1);

  const clubMap = useMemo(
    () => new Map(allClubs.map((c) => [c.id, c])),
    [allClubs],
  );

  if (!seasonCompetition) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          Kein WM-Wettbewerb gefunden.
        </CardContent>
      </Card>
    );
  }

  const sc = seasonCompetition;
  const groups: Id[][] = sc.groups ?? Array.from({ length: WC_GROUP_COUNT }, () => []);
  const assignedIds = new Set(groups.flat());
  const poolIds = sc.clubIds.filter((id) => !assignedIds.has(id));
  const hasSchedule = matches.length > 0;
  const allGroupsFull =
    groups.length === WC_GROUP_COUNT &&
    groups.every((g) => g.length === WC_TEAMS_PER_GROUP);

  // ── mutations ────────────────────────────────────────────────────
  const persistGroups = async (next: Id[][]) => {
    await db.seasonCompetitions.update(sc.id, { groups: next });
    onRefresh();
  };

  const addCountry = async (country: Club) => {
    const fresh = await db.seasonCompetitions.get(sc.id);
    if (!fresh) return;
    if (fresh.clubIds.includes(country.id)) return;
    await db.clubs.put(country);
    await db.seasonCompetitions.update(sc.id, {
      clubIds: [...fresh.clubIds, country.id],
    });
    onRefresh();
  };

  const removeCountry = async (clubId: Id) => {
    const fresh = await db.seasonCompetitions.get(sc.id);
    if (!fresh) return;
    const nextGroups = (fresh.groups ?? []).map((g) => g.filter((id) => id !== clubId));
    await db.seasonCompetitions.update(sc.id, {
      clubIds: fresh.clubIds.filter((id) => id !== clubId),
      groups: nextGroups,
    });
    if (selectedPoolClub === clubId) setSelectedPoolClub(null);
    onRefresh();
  };

  const assignToGroup = async (clubId: Id, groupIdx: number) => {
    const fresh = await db.seasonCompetitions.get(sc.id);
    if (!fresh) return;
    const next = (fresh.groups ?? Array.from({ length: WC_GROUP_COUNT }, () => [] as Id[])).map(
      (g) => g.filter((id) => id !== clubId),
    );
    if (next[groupIdx].length >= WC_TEAMS_PER_GROUP) return;
    next[groupIdx] = [...next[groupIdx], clubId];
    setSelectedPoolClub(null);
    await persistGroups(next);
  };

  const removeFromGroup = async (clubId: Id) => {
    const fresh = await db.seasonCompetitions.get(sc.id);
    if (!fresh) return;
    const next = (fresh.groups ?? []).map((g) => g.filter((id) => id !== clubId));
    await persistGroups(next);
  };

  const randomDraw = async () => {
    const fresh = await db.seasonCompetitions.get(sc.id);
    if (!fresh) return;
    const ids = shuffle(fresh.clubIds).slice(0, TOTAL_TEAMS);
    const next: Id[][] = Array.from({ length: WC_GROUP_COUNT }, () => []);
    ids.forEach((id, i) => {
      next[Math.floor(i / WC_TEAMS_PER_GROUP)].push(id);
    });
    await persistGroups(next);
  };

  const clearGroups = async () => {
    await persistGroups(Array.from({ length: WC_GROUP_COUNT }, () => []));
  };

  const startGroupStage = async () => {
    if (!allGroupsFull) return;
    const { matchdayCount, matches: schedule } = buildGroupStageSchedule(groups);
    const matchdayIds: Id[] = [];
    const matchdayRecords = [];
    for (let n = 1; n <= matchdayCount; n++) {
      const id = newId("md");
      matchdayIds[n] = id;
      matchdayRecords.push({
        id,
        seasonCompetitionId: sc.id,
        number: n,
        name: `Spieltag ${n}`,
      });
    }
    const matchRecords = schedule.map((m) => ({
      id: newId("m"),
      seasonCompetitionId: sc.id,
      matchdayId: matchdayIds[m.matchdayNumber],
      homeClubId: m.homeClubId,
      awayClubId: m.awayClubId,
      isKnockout: false,
      group: m.group,
    }));
    await db.matchdays.bulkAdd(matchdayRecords);
    await db.matches.bulkAdd(matchRecords);
    onRefresh();
  };

  const resetToComposition = async () => {
    if (
      !confirm(
        "Gruppen bearbeiten? Alle Gruppen-Spiele und Ergebnisse werden gelöscht (Länder & Gruppen bleiben erhalten).",
      )
    )
      return;
    const mds = await db.matchdays.where("seasonCompetitionId").equals(sc.id).toArray();
    const ms = await db.matches.where("seasonCompetitionId").equals(sc.id).toArray();
    await db.transaction("rw", db.matchdays, db.matches, async () => {
      for (const m of ms) await db.matches.delete(m.id);
      for (const md of mds) await db.matchdays.delete(md.id);
    });
    onRefresh();
  };

  const handleSaveScore = async (matchId: string, homeGoals: number, awayGoals: number) => {
    await db.matches.update(matchId, { homeGoals, awayGoals });
    onRefresh();
  };
  const handleClearScore = async (matchId: string) => {
    await db.matches.update(matchId, { homeGoals: undefined, awayGoals: undefined });
    onRefresh();
  };

  // ── composition mode ─────────────────────────────────────────────
  if (!hasSchedule) {
    const addableCountries = WC_COUNTRIES.filter((c) => !sc.clubIds.includes(c.id)).filter(
      (c) => c.name.toLowerCase().includes(search.trim().toLowerCase()),
    );

    return (
      <div className="space-y-4">
        <Card className="border-border bg-card">
          <CardContent className="py-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Trophy className="h-5 w-5 text-primary" /> Gruppen zusammenstellen
                </h2>
                <p className="text-sm text-muted-foreground">
                  {sc.clubIds.length} / {TOTAL_TEAMS} Länder hinzugefügt ·{" "}
                  {assignedIds.size} in Gruppen
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="gap-1.5" onClick={() => { setSearch(""); setAddOpen(true); }}>
                  <Plus className="h-4 w-4" /> Land hinzufügen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={randomDraw}
                  disabled={sc.clubIds.length < TOTAL_TEAMS}
                  title={sc.clubIds.length < TOTAL_TEAMS ? `Erst ${TOTAL_TEAMS} Länder hinzufügen` : undefined}
                >
                  <Shuffle className="h-4 w-4" /> Auslosen
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={clearGroups}>
                  <Trash2 className="h-4 w-4" /> Gruppen leeren
                </Button>
              </div>
            </div>

            {/* Pool of added-but-unassigned countries */}
            {poolIds.length > 0 && (
              <div className="mb-4 rounded-lg border border-dashed border-border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nicht zugeordnet ({poolIds.length}) — Land wählen, dann Gruppe antippen
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {poolIds.map((id) => {
                    const c = clubMap.get(id);
                    if (!c) return null;
                    const selected = selectedPoolClub === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedPoolClub(selected ? null : id)}
                        className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          selected
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        <ClubLogo logoUrl={c.logoUrl} name={c.name} shortName={c.shortName} primaryColor={c.primaryColor} size="sm" />
                        <span className="font-medium">{c.name}</span>
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => { e.stopPropagation(); removeCountry(id); }}
                          className="ml-0.5 text-muted-foreground opacity-60 hover:text-red-400 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 12 group cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((memberIds, gi) => {
                const full = memberIds.length >= WC_TEAMS_PER_GROUP;
                const canPlace = selectedPoolClub && !full;
                return (
                  <div
                    key={gi}
                    onClick={() => { if (canPlace) assignToGroup(selectedPoolClub!, gi); }}
                    className={`rounded-lg border p-3 transition-colors ${
                      canPlace
                        ? "cursor-pointer border-primary/60 bg-primary/5 hover:bg-primary/10"
                        : "border-border bg-secondary/20"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold">Gruppe {groupLetter(gi)}</span>
                      <span className={`text-xs ${full ? "text-green-400" : "text-muted-foreground"}`}>
                        {memberIds.length}/{WC_TEAMS_PER_GROUP}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {memberIds.map((id) => {
                        const c = clubMap.get(id);
                        if (!c) return null;
                        return (
                          <div key={id} className="flex items-center gap-2 rounded bg-background/50 px-2 py-1">
                            <ClubLogo logoUrl={c.logoUrl} name={c.name} shortName={c.shortName} primaryColor={c.primaryColor} size="sm" />
                            <span className="flex-1 truncate text-xs font-medium">{c.name}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeFromGroup(id); }}
                              className="text-muted-foreground hover:text-red-400"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {Array.from({ length: WC_TEAMS_PER_GROUP - memberIds.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="rounded border border-dashed border-border/60 px-2 py-1 text-xs text-muted-foreground/50">
                          leer
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-center">
              <Button size="lg" className="gap-2" disabled={!allGroupsFull} onClick={startGroupStage}>
                <ListChecks className="h-5 w-5" />
                Gruppenphase starten
              </Button>
            </div>
            {!allGroupsFull && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Alle 12 Gruppen müssen mit je 4 Ländern gefüllt sein ({assignedIds.size}/{TOTAL_TEAMS}).
              </p>
            )}
          </CardContent>
        </Card>

        {/* Add-country search dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Land hinzufügen
              </DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Land suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="mt-2 flex-1 overflow-y-auto">
              {addableCountries.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Kein Land gefunden.</p>
              ) : (
                <div className="space-y-1">
                  {addableCountries.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addCountry(c)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-secondary/60"
                    >
                      <ClubLogo logoUrl={c.logoUrl} name={c.name} shortName={c.shortName} primaryColor={c.primaryColor} size="sm" />
                      <span className="flex-1 text-sm font-medium">{c.name}</span>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {sc.clubIds.length} / {TOTAL_TEAMS} hinzugefügt · Dialog bleibt offen für mehrere Länder.
            </p>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── play mode ────────────────────────────────────────────────────
  const standings = computeGroupStandings(sc, matches);
  const qualification = computeQualification(standings);
  const qualifiedThirds = new Set(qualification.bestThirdGroups);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-secondary p-1">
          <button
            onClick={() => setPlayTab("tabellen")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              playTab === "tabellen" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Tabellen
          </button>
          <button
            onClick={() => setPlayTab("spiele")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              playTab === "spiele" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Spiele
          </button>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={resetToComposition}>
          <Trash2 className="h-3.5 w-3.5" /> Gruppen bearbeiten
        </Button>
      </div>

      {playTab === "tabellen" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {standings.map((gs) => (
            <GroupTable
              key={gs.group}
              group={gs.group}
              rows={gs.rows}
              clubMap={clubMap}
              qualifiedThird={qualifiedThirds.has(gs.group)}
            />
          ))}
        </div>
      ) : (
        <GroupFixtures
          matches={matches}
          matchdays={matchdays}
          clubMap={clubMap}
          activeMatchday={activeMatchday}
          onMatchdayChange={setActiveMatchday}
          onSaveScore={handleSaveScore}
          onClearScore={handleClearScore}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-green-500" /> K.-o.-Phase (Platz 1-2)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-sky-500" /> Bester Dritter (qualifiziert)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-500/60" /> Dritter (Wildcard-Rennen)</span>
      </div>
    </div>
  );
}

// ── group standings mini-table ───────────────────────────────────────
function GroupTable({
  group,
  rows,
  clubMap,
  qualifiedThird,
}: {
  group: string;
  rows: import("@/lib/standings").StandingRow[];
  clubMap: Map<Id, Club>;
  qualifiedThird: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-sm font-bold">Gruppe {group}</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase text-muted-foreground">
            <th className="w-6 py-1.5 text-center">#</th>
            <th className="py-1.5 pl-1 text-left">Team</th>
            <th className="w-6 py-1.5 text-center">Sp</th>
            <th className="w-8 py-1.5 text-center">+/-</th>
            <th className="w-7 py-1.5 text-center font-bold">Pkt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const c = clubMap.get(row.clubId);
            if (!c) return null;
            const pos = i + 1;
            const barColor =
              pos <= 2
                ? "bg-green-500"
                : pos === 3
                  ? qualifiedThird
                    ? "bg-sky-500"
                    : "bg-amber-500/60"
                  : "";
            return (
              <tr key={row.clubId} className="border-t border-border/40">
                <td className="relative py-1.5 text-center font-medium">
                  {barColor && <span className={`absolute left-0 top-1 bottom-1 w-1 ${barColor}`} />}
                  {pos}
                </td>
                <td className="py-1.5 pl-1">
                  <div className="flex items-center gap-1.5">
                    <ClubLogo logoUrl={c.logoUrl} name={c.name} shortName={c.shortName} primaryColor={c.primaryColor} size="sm" />
                    <span className="truncate font-medium">{c.name}</span>
                  </div>
                </td>
                <td className="py-1.5 text-center text-muted-foreground">{row.played}</td>
                <td className="py-1.5 text-center">
                  {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                </td>
                <td className="py-1.5 text-center font-bold">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── group fixtures with a matchday selector ──────────────────────────
function GroupFixtures({
  matches,
  matchdays,
  clubMap,
  activeMatchday,
  onMatchdayChange,
  onSaveScore,
  onClearScore,
}: {
  matches: Match[];
  matchdays: Matchday[];
  clubMap: Map<Id, Club>;
  activeMatchday: number;
  onMatchdayChange: (n: number) => void;
  onSaveScore: (id: string, h: number, a: number) => void;
  onClearScore: (id: string) => void;
}) {
  const mdNumberById = useMemo(
    () => new Map(matchdays.map((md) => [md.id, md.number])),
    [matchdays],
  );
  const matchdayNumbers = useMemo(
    () => matchdays.map((md) => md.number).sort((a, b) => a - b),
    [matchdays],
  );

  // Matches of the active matchday, grouped by group letter.
  const shownByGroup = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      if (!m.matchdayId || mdNumberById.get(m.matchdayId) !== activeMatchday) continue;
      const g = m.group ?? "?";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(m);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [matches, mdNumberById, activeMatchday]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {matchdayNumbers.map((n) => (
          <button
            key={n}
            onClick={() => onMatchdayChange(n)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeMatchday === n ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            Spieltag {n}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {shownByGroup.map(([g, gms]) => (
          <div key={g}>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Gruppe {g}</p>
            <div className="grid gap-2">
              {gms.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  homeClub={clubMap.get(match.homeClubId)}
                  awayClub={clubMap.get(match.awayClubId)}
                  onSaveScore={onSaveScore}
                  onClearScore={onClearScore}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
