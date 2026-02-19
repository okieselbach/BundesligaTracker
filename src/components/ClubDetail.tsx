"use client";

import type { Club, Match } from "@/lib/db";
import { ClubLogo } from "./ClubLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getBundesligaUrl } from "@/data/clubs";

interface ClubDetailProps {
  club: Club;
  matches: Match[];
  allClubs: Club[];
  competitionSlug?: string;
  onBack: () => void;
}

export function ClubDetail({ club, matches, allClubs, competitionSlug, onBack }: ClubDetailProps) {
  const clubMap = new Map(allClubs.map((c) => [c.id, c]));

  // Find all matches involving this club
  const clubMatches = matches
    .filter((m) => m.homeClubId === club.id || m.awayClubId === club.id)
    .sort((a, b) => {
      // Sort by matchday if available
      if (a.matchdayId && b.matchdayId) return a.matchdayId.localeCompare(b.matchdayId);
      return 0;
    });

  const played = clubMatches.filter((m) => typeof m.homeGoals === "number");
  const wins = played.filter((m) => {
    const isHome = m.homeClubId === club.id;
    return isHome ? m.homeGoals! > m.awayGoals! : m.awayGoals! > m.homeGoals!;
  });
  const draws = played.filter((m) => m.homeGoals === m.awayGoals);
  const losses = played.filter((m) => {
    const isHome = m.homeClubId === club.id;
    return isHome ? m.homeGoals! < m.awayGoals! : m.awayGoals! < m.homeGoals!;
  });

  const blUrl = club.clubUrl
    || (competitionSlug === "1-bundesliga" || competitionSlug === "2-bundesliga"
      ? getBundesligaUrl(club.slug, competitionSlug)
      : null);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <ClubLogo
            logoUrl={club.logoUrl}
            name={club.name}
            shortName={club.shortName}
            primaryColor={club.primaryColor}
            size="xl"
          />
          <div>
            <CardTitle className="text-xl">{club.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{club.shortName}</p>
            <div className="mt-1 h-1.5 w-16 rounded-full" style={{ backgroundColor: club.primaryColor }} />
          </div>
          {blUrl && (
            <a
              href={blUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto"
            >
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Club-Info
              </Button>
            </a>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Stats */}
        <div className="mb-6 flex gap-3">
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {played.length} Spiele
          </Badge>
          <Badge className="bg-green-500/20 text-green-400 text-sm py-1 px-3">
            {wins.length} S
          </Badge>
          <Badge className="bg-yellow-500/20 text-yellow-400 text-sm py-1 px-3">
            {draws.length} U
          </Badge>
          <Badge className="bg-red-500/20 text-red-400 text-sm py-1 px-3">
            {losses.length} N
          </Badge>
        </div>

        {/* Match list */}
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Alle Spiele
        </h3>

        {clubMatches.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">Noch keine Spiele.</p>
        )}

        <div className="space-y-1.5">
          {clubMatches.map((m) => {
            const isHome = m.homeClubId === club.id;
            const opponent = clubMap.get(isHome ? m.awayClubId : m.homeClubId);
            if (!opponent) return null;

            const hasResult = typeof m.homeGoals === "number";
            let resultBadge = null;
            if (hasResult) {
              const won = isHome ? m.homeGoals! > m.awayGoals! : m.awayGoals! > m.homeGoals!;
              const draw = m.homeGoals === m.awayGoals;
              if (won) resultBadge = <span className="text-xs font-bold text-green-400 w-5">S</span>;
              else if (draw) resultBadge = <span className="text-xs font-bold text-yellow-400 w-5">U</span>;
              else resultBadge = <span className="text-xs font-bold text-red-400 w-5">N</span>;
            }

            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-md bg-secondary/30 px-3 py-2 text-sm"
              >
                {resultBadge || <span className="w-5" />}
                <span className="text-xs text-muted-foreground w-6">{isHome ? "H" : "A"}</span>
                <ClubLogo
                  logoUrl={opponent.logoUrl}
                  name={opponent.name}
                  shortName={opponent.shortName}
                  primaryColor={opponent.primaryColor}
                  size="sm"
                />
                <span className="flex-1 truncate">{opponent.name}</span>
                {hasResult ? (
                  <span className="font-mono font-bold">
                    {m.homeGoals}:{m.awayGoals}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-:-</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
