"use client";

import { useEffect, useState, useCallback } from "react";
import { db, type Season, type Competition, type SeasonCompetition, type Club, type Matchday, type Match, type CupRound, type Id } from "@/lib/db";
import { seedQuickStart, hasData } from "@/lib/seed";
import { Header } from "@/components/Header";
import { CompetitionTabs } from "@/components/CompetitionTabs";
import { StandingsTable } from "@/components/StandingsTable";
import { MatchdayView } from "@/components/MatchdayView";
import { ClubGrid } from "@/components/ClubGrid";
import { AllClubsView } from "@/components/AllClubsView";
import { CupView } from "@/components/CupView";
import { AllTimeTable } from "@/components/AllTimeTable";
import { HistoryView } from "@/components/HistoryView";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ExportImport } from "@/components/ExportImport";
import { SeasonManager } from "@/components/SeasonManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

type SubTab = "spieltage" | "tabelle" | "clubs" | "ewige-tabelle";

// Competition slug order for "up"/"down" moves
const LEAGUE_ORDER = ["1-bundesliga", "2-bundesliga", "3-liga"];

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [dataExists, setDataExists] = useState(false);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [activeCompetition, setActiveCompetition] = useState<Competition | null>(null);
  const [seasonCompetitions, setSeasonCompetitions] = useState<SeasonCompetition[]>([]);
  const [seasonCompetition, setSeasonCompetition] = useState<SeasonCompetition | null>(null);
  const [allDbClubs, setAllDbClubs] = useState<Club[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [cupRounds, setCupRounds] = useState<CupRound[]>([]);
  const [subTab, setSubTab] = useState<SubTab>("tabelle");
  const [showSettings, setShowSettings] = useState(false);
  const [showHistorie, setShowHistorie] = useState(false);
  const [showAllClubs, setShowAllClubs] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Load initial data
  useEffect(() => {
    (async () => {
      const exists = await hasData();
      setDataExists(exists);
      if (exists) {
        const allSeasons = await db.seasons.orderBy("createdAt").reverse().toArray();
        setSeasons(allSeasons);
        const current = allSeasons.find((s) => s.isCurrent) ?? allSeasons[0];
        setCurrentSeason(current);
        const allComps = await db.competitions.orderBy("sortOrder").toArray();
        setCompetitions(allComps);
        // Preserve active competition on refresh, only default to first on initial load
        setActiveCompetition((prev) => {
          if (prev) {
            const stillExists = allComps.find((c) => c.id === prev.id);
            if (stillExists) return stillExists;
          }
          return allComps[0] ?? null;
        });
        const allClubs = await db.clubs.toArray();
        setAllDbClubs(allClubs);
      }
      setLoading(false);
    })();
  }, [refreshKey]);

  // Load season-competition data when season/competition changes
  useEffect(() => {
    if (!currentSeason || !activeCompetition) return;
    (async () => {
      // Load all season-competitions for this season (for club moves)
      const allSCs = await db.seasonCompetitions
        .where("seasonId")
        .equals(currentSeason.id)
        .toArray();
      setSeasonCompetitions(allSCs);

      const sc = allSCs.find((s) => s.competitionId === activeCompetition.id) ?? null;
      setSeasonCompetition(sc);

      if (sc) {
        const allClubs = await db.clubs.toArray();
        setAllDbClubs(allClubs);
        const participatingClubs = sc.clubIds
          .map((id) => allClubs.find((c) => c.id === id))
          .filter(Boolean) as Club[];
        setClubs(participatingClubs);

        if (activeCompetition.type === "league") {
          const mds = await db.matchdays
            .where("seasonCompetitionId")
            .equals(sc.id)
            .sortBy("number");
          setMatchdays(mds);
        } else {
          const rounds = await db.cupRounds
            .where("seasonCompetitionId")
            .equals(sc.id)
            .sortBy("number");
          setCupRounds(rounds);
        }

        const allMatches = await db.matches
          .where("seasonCompetitionId")
          .equals(sc.id)
          .toArray();
        setMatches(allMatches);
      } else {
        setClubs([]);
        setMatchdays([]);
        setMatches([]);
        setCupRounds([]);
      }
    })();
  }, [currentSeason, activeCompetition, refreshKey]);

  const handleQuickStart = async (manual: boolean) => {
    setLoading(true);
    setShowSettings(false);
    await seedQuickStart("2025/26", manual);
    setRefreshKey((k) => k + 1);
  };

  const handleSeasonChange = async (seasonId: string) => {
    const season = seasons.find((s) => s.id === seasonId);
    if (season) setCurrentSeason(season);
  };

  // Move club between leagues
  const handleMoveClub = async (clubId: Id, direction: "up" | "down") => {
    if (!activeCompetition || !currentSeason) return;

    const currentSlug = activeCompetition.slug;
    const currentIdx = LEAGUE_ORDER.indexOf(currentSlug);
    if (currentIdx === -1) return;

    const targetIdx = direction === "up" ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= LEAGUE_ORDER.length) return;

    const targetSlug = LEAGUE_ORDER[targetIdx];
    const targetComp = competitions.find((c) => c.slug === targetSlug);
    if (!targetComp) return;

    const sourceSC = seasonCompetitions.find((sc) => sc.competitionId === activeCompetition.id);
    const targetSC = seasonCompetitions.find((sc) => sc.competitionId === targetComp.id);
    if (!sourceSC || !targetSC) return;

    // Remove from source, add to target
    const newSourceClubs = sourceSC.clubIds.filter((id) => id !== clubId);
    const newTargetClubs = [...targetSC.clubIds, clubId];

    await db.seasonCompetitions.update(sourceSC.id, { clubIds: newSourceClubs });
    await db.seasonCompetitions.update(targetSC.id, { clubIds: newTargetClubs });

    refresh();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">&#9917;</div>
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  if (!dataExists) {
    return <WelcomeScreen onQuickStart={handleQuickStart} onImportDone={refresh} />;
  }

  const isCup = activeCompetition?.type === "cup";
  const isLeague = activeCompetition?.type === "league";
  const canMoveUp = isLeague && LEAGUE_ORDER.indexOf(activeCompetition?.slug ?? "") > 0;
  const canMoveDown = isLeague && LEAGUE_ORDER.indexOf(activeCompetition?.slug ?? "") < LEAGUE_ORDER.length - 1;
  const canMove = canMoveUp || canMoveDown;

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto overscroll-none">
      <div className="sticky top-0 z-50">
        <Header
          seasons={seasons}
          currentSeason={currentSeason}
          onSeasonChange={handleSeasonChange}
          onSettingsClick={() => setShowSettings(!showSettings)}
          onHistorieClick={() => setShowHistorie(true)}
        />

        {showSettings && (
          <div className="border-b border-border bg-[#282d34] max-h-[60vh] overflow-y-auto">
            <div className="mx-auto max-w-5xl px-4 py-4 space-y-4">
              <SeasonManager
                seasons={seasons}
                currentSeason={currentSeason}
                onRefresh={refresh}
              />
              <Separator />
              <ExportImport onImportDone={refresh} currentSeason={currentSeason} />
            </div>
          </div>
        )}
      </div>

      <CompetitionTabs
        competitions={competitions}
        activeCompetition={activeCompetition}
        onSelect={(comp) => { setActiveCompetition(comp); setShowAllClubs(false); }}
        allClubsActive={showAllClubs}
        onAllClubsClick={() => setShowAllClubs(true)}
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 flex-1">
        {showAllClubs ? (
          <AllClubsView
            clubs={allDbClubs}
            competitions={competitions}
            seasonCompetitions={seasonCompetitions}
            onRefresh={refresh}
          />
        ) : isCup ? (
          <CupView
            seasonCompetition={seasonCompetition}
            cupRounds={cupRounds}
            matches={matches}
            clubs={clubs}
            onRefresh={refresh}
            leagueClubIds={(() => {
              const bl1 = competitions.find((c) => c.slug === "1-bundesliga");
              const bl2 = competitions.find((c) => c.slug === "2-bundesliga");
              const sc1 = bl1 ? seasonCompetitions.find((sc) => sc.competitionId === bl1.id) : undefined;
              const sc2 = bl2 ? seasonCompetitions.find((sc) => sc.competitionId === bl2.id) : undefined;
              if (sc1 && sc2) return { bundesliga1: sc1.clubIds, bundesliga2: sc2.clubIds };
              return undefined;
            })()}
          />
        ) : (
          <Tabs value={subTab} onValueChange={(v) => setSubTab(v as SubTab)} className="w-full">
            <TabsList className="mb-6 w-full bg-secondary">
              <TabsTrigger value="tabelle" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Tabelle
              </TabsTrigger>
              <TabsTrigger value="spieltage" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Spieltage
              </TabsTrigger>
              <TabsTrigger value="clubs" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Clubs
              </TabsTrigger>
              <TabsTrigger value="ewige-tabelle" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Ewige Tabelle
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tabelle">
              {seasonCompetition && (
                <StandingsTable
                  seasonCompetition={seasonCompetition}
                  matches={matches}
                  matchdays={matchdays}
                  clubs={clubs}
                  competitionSlug={activeCompetition?.slug ?? ""}
                />
              )}
            </TabsContent>

            <TabsContent value="spieltage">
              <MatchdayView
                matchdays={matchdays}
                matches={matches}
                clubs={clubs}
                seasonCompetitionId={seasonCompetition?.id}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="clubs">
              <ClubGrid
                clubs={clubs}
                competitionSlug={activeCompetition?.slug}
                allMatches={matches}
                allClubs={allDbClubs}
                seasonCompetitionId={seasonCompetition?.id}
                onMoveClub={canMove ? handleMoveClub : undefined}
                leagueName={activeCompetition?.name}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="ewige-tabelle">
              {activeCompetition && (
                <AllTimeTable
                  competition={activeCompetition}
                  clubs={allDbClubs}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <HistoryView
        open={showHistorie}
        onOpenChange={setShowHistorie}
      />

      <footer className="border-t border-border bg-[#282d34] py-4 text-xs text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4">
          Built with ❤️ by Oliver for Phil
        </div>
      </footer>
    </div>
  );
}
