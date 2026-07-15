"use client";

import { useCallback, useEffect, useState } from "react";
import type { Club, CupRound, Id, Match, SeasonCompetition } from "@/lib/db";
import { db, newId } from "@/lib/db";
import { getCupWinner } from "@/lib/cup";
import {
  BRACKET_COLUMNS,
  BRACKET_WIRING,
  buildR32Pairings,
  computeBracketUpdates,
  computeGroupStandings,
  computeQualification,
  getCupLoser,
  isGroupStageComplete,
  WC_ROUND_NAMES,
} from "@/lib/worldcup";
import { ClubLogo } from "./ClubLogo";
import { Confetti } from "./Confetti";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Shuffle, RotateCcw, Check, Pencil, X } from "lucide-react";

interface WorldCupBracketProps {
  seasonId: Id;
  /** Bumped by the parent on every global refresh, re-triggers our load. */
  refreshKey: number;
  allClubs: Club[];
  onRefresh: () => void;
}

const GROUPS_COMPETITION_ID = "comp_wc_groups";
const KO_COMPETITION_ID = "comp_wc_ko";

export function WorldCupBracket({ seasonId, refreshKey, allClubs, onRefresh }: WorldCupBracketProps) {
  const [koSC, setKoSC] = useState<SeasonCompetition | null>(null);
  const [groupSC, setGroupSC] = useState<SeasonCompetition | null>(null);
  const [groupMatches, setGroupMatches] = useState<Match[]>([]);
  const [koMatches, setKoMatches] = useState<Match[]>([]);
  const [rounds, setRounds] = useState<CupRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const clubMap = new Map(allClubs.map((c) => [c.id, c]));

  const load = useCallback(async () => {
    const scs = await db.seasonCompetitions.where("seasonId").equals(seasonId).toArray();
    const ko = scs.find((s) => s.competitionId === KO_COMPETITION_ID) ?? null;
    const gp = scs.find((s) => s.competitionId === GROUPS_COMPETITION_ID) ?? null;
    setKoSC(ko);
    setGroupSC(gp);
    setGroupMatches(gp ? await db.matches.where("seasonCompetitionId").equals(gp.id).toArray() : []);
    setKoMatches(ko ? await db.matches.where("seasonCompetitionId").equals(ko.id).toArray() : []);
    setRounds(ko ? await db.cupRounds.where("seasonCompetitionId").equals(ko.id).sortBy("number") : []);
    setLoading(false);
  }, [seasonId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const groupsDone =
    groupSC != null && isGroupStageComplete(groupSC, groupMatches);
  const hasBracket = koMatches.length > 0;

  // ── build the bracket from the group results ─────────────────────
  const startKnockout = async () => {
    if (!koSC || !groupSC) return;
    setBusy(true);
    try {
      const standings = computeGroupStandings(groupSC, groupMatches);
      const qual = computeQualification(standings);
      const pairings = buildR32Pairings(qual);
      if (!pairings) {
        alert("Konnte die K.-o.-Runde nicht auslosen. Bitte Gruppenergebnisse prüfen.");
        return;
      }

      // 5 cup rounds (R32, R16, QF, SF, Final).
      const roundIdByNumber: Record<number, Id> = {};
      const roundRecords: CupRound[] = [];
      for (const [numStr, name] of Object.entries(WC_ROUND_NAMES)) {
        const number = Number(numStr);
        const id = newId("cr");
        roundIdByNumber[number] = id;
        roundRecords.push({ id, seasonCompetitionId: koSC.id, number, name });
      }

      const matchRecords: Match[] = [];
      // Round of 32 — real teams from the group results.
      for (const p of pairings) {
        matchRecords.push({
          id: newId("m"),
          seasonCompetitionId: koSC.id,
          cupRoundId: roundIdByNumber[1],
          homeClubId: p.homeClubId,
          awayClubId: p.awayClubId,
          isKnockout: true,
          bracketPos: p.pos,
        });
      }
      // Downstream — placeholder teams, filled as results come in.
      for (const def of BRACKET_WIRING) {
        matchRecords.push({
          id: newId("m"),
          seasonCompetitionId: koSC.id,
          cupRoundId: roundIdByNumber[def.round],
          homeClubId: "",
          awayClubId: "",
          isKnockout: true,
          bracketPos: def.pos,
        });
      }

      await db.cupRounds.bulkAdd(roundRecords);
      await db.matches.bulkAdd(matchRecords);
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const resetKnockout = async () => {
    if (!koSC) return;
    if (!confirm("K.-o.-Runde komplett zurücksetzen? Alle KO-Ergebnisse gehen verloren.")) return;
    setBusy(true);
    try {
      const ms = await db.matches.where("seasonCompetitionId").equals(koSC.id).toArray();
      const crs = await db.cupRounds.where("seasonCompetitionId").equals(koSC.id).toArray();
      await db.transaction("rw", db.matches, db.cupRounds, async () => {
        for (const m of ms) await db.matches.delete(m.id);
        for (const cr of crs) await db.cupRounds.delete(cr.id);
      });
      onRefresh();
    } finally {
      setBusy(false);
    }
  };

  /** Re-resolve downstream team slots after a result changed. */
  const applyCascade = async () => {
    if (!koSC) return;
    const ms = await db.matches.where("seasonCompetitionId").equals(koSC.id).toArray();
    const updates = computeBracketUpdates(ms);
    for (const u of updates) {
      await db.matches.update(u.id, {
        homeClubId: u.homeClubId,
        awayClubId: u.awayClubId,
        homeGoals: undefined,
        awayGoals: undefined,
        homePen: undefined,
        awayPen: undefined,
      });
    }
  };

  const saveScore = async (matchId: Id, homeGoals: number, awayGoals: number, homePen?: number, awayPen?: number) => {
    await db.matches.update(matchId, {
      homeGoals,
      awayGoals,
      homePen: homePen ?? undefined,
      awayPen: awayPen ?? undefined,
    });
    await applyCascade();
    onRefresh();
  };

  const clearScore = async (matchId: Id) => {
    await db.matches.update(matchId, {
      homeGoals: undefined,
      awayGoals: undefined,
      homePen: undefined,
      awayPen: undefined,
    });
    await applyCascade();
    onRefresh();
  };

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-muted-foreground">Laden...</CardContent>
      </Card>
    );
  }

  if (!hasBracket) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center">
          <div className="mb-4 text-4xl">🏆</div>
          <h3 className="mb-2 text-lg font-semibold">K.-o.-Runde</h3>
          {groupsDone ? (
            <>
              <p className="mb-6 text-sm text-muted-foreground">
                Alle Gruppen sind gespielt. Die 32 qualifizierten Teams (Gruppen-Erste, -Zweite und die 8 besten Dritten) werden nach der offiziellen WM-Bracket-Vorlage gesetzt.
              </p>
              <Button className="gap-2" onClick={startKnockout} disabled={busy}>
                <Shuffle className="h-4 w-4" /> K.-o.-Runde auslosen
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Die K.-o.-Runde startet, sobald <span className="font-medium text-foreground">alle 12 Gruppen komplett gespielt</span> sind. Trage zuerst alle Gruppen-Ergebnisse in der Gruppenphase ein.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const matchByPos = new Map<string, Match>();
  for (const m of koMatches) if (m.bracketPos) matchByPos.set(m.bracketPos, m);
  const thirdMatch = matchByPos.get("THIRD");
  const finalMatch = matchByPos.get("FINAL");
  const champion = finalMatch ? getCupWinner(finalMatch) : null;
  const championClub = champion ? clubMap.get(champion) : null;

  const roundNameByNumber = new Map(rounds.map((r) => [r.number, r.name]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-5 w-5 text-primary" /> K.-o.-Runde
        </h2>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={resetKnockout} disabled={busy}>
          <RotateCcw className="h-3.5 w-3.5" /> Zurücksetzen
        </Button>
      </div>

      {championClub && (
        <>
          <Confetti />
          <div className="flex flex-col items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 py-6">
            <div className="text-4xl">🏆</div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Weltmeister</p>
            <ClubLogo logoUrl={championClub.logoUrl} name={championClub.name} shortName={championClub.shortName} primaryColor={championClub.primaryColor} size="xl" />
            <p className="text-2xl font-bold text-primary">{championClub.name}</p>
          </div>
        </>
      )}

      {/* Bracket tree — horizontally scrollable */}
      <div className="overflow-x-auto pb-3">
        <div className="flex gap-4" style={{ minWidth: "max-content" }}>
          {BRACKET_COLUMNS.map((col) => (
            <div key={col.round} className="flex flex-col" style={{ minWidth: 190 }}>
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {roundNameByNumber.get(col.round) ?? WC_ROUND_NAMES[col.round]}
              </p>
              <div className="flex flex-1 flex-col justify-around gap-2">
                {col.positions.map((pos) => {
                  const match = matchByPos.get(pos);
                  if (!match) return null;
                  return (
                    <BracketMatch
                      key={pos}
                      match={match}
                      homeClub={clubMap.get(match.homeClubId)}
                      awayClub={clubMap.get(match.awayClubId)}
                      onSave={saveScore}
                      onClear={clearScore}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Third-place play-off */}
      {thirdMatch && (
        <div className="max-w-xs">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Spiel um Platz 3</p>
          <BracketMatch
            match={thirdMatch}
            homeClub={clubMap.get(thirdMatch.homeClubId)}
            awayClub={clubMap.get(thirdMatch.awayClubId)}
            onSave={saveScore}
            onClear={clearScore}
          />
        </div>
      )}
    </div>
  );
}

// ── compact, inline-editable bracket match node ──────────────────────
const GOALS = Array.from({ length: 16 }, (_, i) => i);

function BracketMatch({
  match,
  homeClub,
  awayClub,
  onSave,
  onClear,
}: {
  match: Match;
  homeClub?: Club;
  awayClub?: Club;
  onSave: (id: Id, h: number, a: number, hp?: number, ap?: number) => void;
  onClear: (id: Id) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [h, setH] = useState(match.homeGoals?.toString() ?? "");
  const [a, setA] = useState(match.awayGoals?.toString() ?? "");
  const [hp, setHp] = useState(match.homePen?.toString() ?? "");
  const [ap, setAp] = useState(match.awayPen?.toString() ?? "");

  const bothTeams = !!homeClub && !!awayClub;
  const hasScore = typeof match.homeGoals === "number" && typeof match.awayGoals === "number";
  const winner = getCupWinner(match);
  const loser = getCupLoser(match);
  const isDraw = hasScore && match.homeGoals === match.awayGoals;

  const beginEdit = () => {
    setH(match.homeGoals?.toString() ?? "");
    setA(match.awayGoals?.toString() ?? "");
    setHp(match.homePen?.toString() ?? "");
    setAp(match.awayPen?.toString() ?? "");
    setEditing(true);
  };

  const save = () => {
    const hg = parseInt(h);
    const ag = parseInt(a);
    if (isNaN(hg) || isNaN(ag)) return;
    if (hg === ag) {
      const hpv = parseInt(hp);
      const apv = parseInt(ap);
      if (isNaN(hpv) || isNaN(apv) || hpv === apv) return; // draw needs a shootout winner
      onSave(match.id, hg, ag, hpv, apv);
    } else {
      onSave(match.id, hg, ag);
    }
    setEditing(false);
  };

  const row = (club: Club | undefined, isHome: boolean) => {
    const goals = isHome ? match.homeGoals : match.awayGoals;
    const pen = isHome ? match.homePen : match.awayPen;
    const clubId = isHome ? match.homeClubId : match.awayClubId;
    const isWinner = winner && clubId === winner;
    const isLoser = loser && clubId === loser;
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 ${isWinner ? "font-bold" : isLoser ? "opacity-55" : ""}`}>
        {club ? (
          <ClubLogo logoUrl={club.logoUrl} name={club.name} shortName={club.shortName} primaryColor={club.primaryColor} size="sm" />
        ) : (
          <div className="h-5 w-5 shrink-0 rounded-full bg-muted-foreground/20" />
        )}
        <span className="flex-1 truncate text-xs">{club ? club.shortName : "—"}</span>
        {hasScore && (
          <span className="text-xs tabular-nums">
            {goals}
            {isDraw && typeof pen === "number" && <span className="text-[10px] text-muted-foreground"> ({pen})</span>}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-md border border-border bg-secondary/30">
      {editing ? (
        <div className="p-2 space-y-1.5">
          <div className="flex items-center gap-1">
            <span className="flex-1 truncate text-xs">{homeClub?.shortName ?? "—"}</span>
            <select value={h} onChange={(e) => setH(e.target.value)} className="h-7 w-10 rounded border border-border bg-background text-center text-xs">
              <option value="">-</option>
              {GOALS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <span className="flex-1 truncate text-xs">{awayClub?.shortName ?? "—"}</span>
            <select value={a} onChange={(e) => setA(e.target.value)} className="h-7 w-10 rounded border border-border bg-background text-center text-xs">
              <option value="">-</option>
              {GOALS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {h !== "" && a !== "" && parseInt(h) === parseInt(a) && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="flex-1">n.E.</span>
              <select value={hp} onChange={(e) => setHp(e.target.value)} className="h-6 w-9 rounded border border-border bg-background text-center">
                <option value="">-</option>
                {GOALS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>:</span>
              <select value={ap} onChange={(e) => setAp(e.target.value)} className="h-6 w-9 rounded border border-border bg-background text-center">
                <option value="">-</option>
                {GOALS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-6 flex-1 gap-1 text-green-400" onClick={save}>
              <Check className="h-3 w-3" /> OK
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-muted-foreground" onClick={() => setEditing(false)}>
              <X className="h-3 w-3" />
            </Button>
            {hasScore && (
              <Button size="sm" variant="ghost" className="h-6 text-red-400 text-[10px]" onClick={() => { onClear(match.id); setEditing(false); }}>
                Löschen
              </Button>
            )}
          </div>
        </div>
      ) : (
        <button
          className="w-full text-left disabled:cursor-not-allowed"
          disabled={!bothTeams}
          onClick={beginEdit}
          title={bothTeams ? "Ergebnis eintragen" : "Noch nicht qualifiziert"}
        >
          {row(homeClub, true)}
          <div className="border-t border-border/40" />
          {row(awayClub, false)}
          {bothTeams && !hasScore && (
            <div className="flex items-center justify-center gap-1 border-t border-border/40 py-0.5 text-[10px] text-muted-foreground">
              <Pencil className="h-2.5 w-2.5" /> Ergebnis
            </div>
          )}
        </button>
      )}
    </div>
  );
}
