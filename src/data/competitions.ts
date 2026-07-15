import type { Competition } from "@/lib/db";

export const COMPETITIONS: Competition[] = [
  {
    id: "comp_1bl",
    name: "1. Bundesliga",
    shortName: "1. BL",
    type: "league",
    slug: "1-bundesliga",
    sortOrder: 1,
  },
  {
    id: "comp_2bl",
    name: "2. Bundesliga",
    shortName: "2. BL",
    type: "league",
    slug: "2-bundesliga",
    sortOrder: 2,
  },
  {
    id: "comp_3bl",
    name: "3. Liga",
    shortName: "3. Liga",
    type: "league",
    slug: "3-liga",
    sortOrder: 3,
  },
  {
    id: "comp_dfb",
    name: "DFB-Pokal",
    shortName: "DFB-Pokal",
    type: "cup",
    slug: "dfb-pokal",
    sortOrder: 4,
  },
  // 🇬🇧 England
  {
    id: "comp_pl",
    name: "Premier League",
    shortName: "PL",
    type: "league",
    slug: "premier-league",
    sortOrder: 10,
  },
  {
    id: "comp_facup",
    name: "FA Cup",
    shortName: "FA Cup",
    type: "cup",
    slug: "fa-cup",
    sortOrder: 11,
  },
  // 🏆 Weltmeisterschaft
  {
    id: "comp_wc_groups",
    name: "Gruppenphase",
    shortName: "Gruppen",
    type: "league",
    slug: "wm-gruppen",
    sortOrder: 20,
  },
  {
    id: "comp_wc_ko",
    name: "K.-o.-Runde",
    shortName: "K.o.",
    type: "cup",
    slug: "wm-ko",
    sortOrder: 21,
  },
];
